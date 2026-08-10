package com.example.trelloclone.repository;

import com.example.trelloclone.entity.CardEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface CardRepository extends JpaRepository<CardEntity, Long>, JpaSpecificationExecutor<CardEntity> {

    long countByList_Id(Long listId);

    List<CardEntity> findByList_IdOrderBySortOrderAsc(Long listId);
}
