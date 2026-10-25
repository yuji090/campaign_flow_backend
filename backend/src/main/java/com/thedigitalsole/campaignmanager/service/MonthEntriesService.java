package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.finance.MonthEntriesResponse;
import com.thedigitalsole.campaignmanager.model.campaign.Campaign;
import com.thedigitalsole.campaignmanager.model.campaign.CampaignMonth;
import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;
import com.thedigitalsole.campaignmanager.model.distribution.Distribution;
import com.thedigitalsole.campaignmanager.model.distribution.DistributionMonth;
import com.thedigitalsole.campaignmanager.model.distribution.DistributionStatus;
import com.thedigitalsole.campaignmanager.repository.CampaignMonthRepository;
import com.thedigitalsole.campaignmanager.repository.CampaignRepository;
import com.thedigitalsole.campaignmanager.repository.DistributionMonthRepository;
import com.thedigitalsole.campaignmanager.repository.DistributionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The monthly entry sheet: which campaigns and distributions need numbers for a month,
 * and what is already saved. Saving still goes through the normal month endpoints.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MonthEntriesService {

    private final CampaignRepository campaignRepository;
    private final CampaignMonthRepository campaignMonthRepository;
    private final DistributionRepository distributionRepository;
    private final DistributionMonthRepository distributionMonthRepository;
    private final CampaignService campaignService;
    private final DistributionService distributionService;
    private final PeriodService periodService;

    public MonthEntriesResponse getEntries(YearMonth month) {

        LocalDate monthStart = month.atDay(1);
        boolean closed = periodService.isClosed(month);

        Map<Long, CampaignMonth> revenueByCampaign = campaignMonthRepository.findAllInRange(monthStart, monthStart)
                .stream()
                .collect(Collectors.toMap(m -> m.getCampaign().getId(), Function.identity()));

        Map<Long, DistributionMonth> entryByDistribution = distributionMonthRepository.findAllInRange(monthStart, monthStart)
                .stream()
                .collect(Collectors.toMap(m -> m.getDistribution().getId(), Function.identity()));

        Map<Long, List<Distribution>> distributionsByCampaign = distributionRepository.findAllWithPublisher()
                .stream()
                .filter(d -> entryByDistribution.containsKey(d.getId()) || runsIn(d, month))
                .collect(Collectors.groupingBy(d -> d.getCampaign().getId()));

        List<MonthEntriesResponse.CampaignEntry> rows = campaignRepository.findAll().stream()
                // Live and paused campaigns, plus any campaign that already has numbers this month
                .filter(c -> revenueByCampaign.containsKey(c.getId())
                        || distributionsByCampaign.containsKey(c.getId())
                        || (c.getStatus() == CampaignStatus.LIVE && startedBy(c.getStartDate(), c.getCreatedAt(), month)))
                .sorted(Comparator.comparing(Campaign::getName, String.CASE_INSENSITIVE_ORDER))
                .map(c -> new MonthEntriesResponse.CampaignEntry(
                        c.getId(),
                        c.getName(),
                        c.getAdvertiser() != null ? c.getAdvertiser().getCompanyName() : null,
                        c.isDirect(),
                        c.getPricingModel(),
                        c.getStatus(),
                        c.getCurrency(),
                        revenueByCampaign.containsKey(c.getId())
                                ? campaignService.toMonthResponse(revenueByCampaign.get(c.getId()), closed)
                                : null,
                        distributionsByCampaign.getOrDefault(c.getId(), List.of()).stream()
                                .sorted(Comparator.comparing(d -> d.getPublisher().getCompanyName(), String.CASE_INSENSITIVE_ORDER))
                                .map(d -> new MonthEntriesResponse.DistributionEntry(
                                        d.getId(),
                                        d.getPublisher().getCompanyName(),
                                        d.getLabel(),
                                        d.getStatus(),
                                        d.getPayout(),
                                        entryByDistribution.containsKey(d.getId())
                                                ? distributionService.toMonthResponse(entryByDistribution.get(d.getId()), closed)
                                                : null))
                                .toList()))
                .toList();

        return new MonthEntriesResponse(month, closed, rows);
    }

    // Active or paused, started by the month's end and not ended before it began
    private static boolean runsIn(Distribution d, YearMonth month) {

        if (d.getStatus() == DistributionStatus.COMPLETED) {
            return false;
        }

        boolean notEnded = d.getEndDate() == null || !d.getEndDate().isBefore(month.atDay(1));

        return startedBy(d.getStartDate(), d.getCreatedAt(), month) && notEnded;
    }

    // Uses the start date, or the date it was added when no start date is set
    private static boolean startedBy(LocalDate startDate, LocalDateTime createdAt, YearMonth month) {

        LocalDate start = startDate != null ? startDate : createdAt != null ? createdAt.toLocalDate() : null;

        return start == null || !start.isAfter(month.atEndOfMonth());
    }
}
